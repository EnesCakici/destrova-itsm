#!/bin/sh
# Deploy destrova-ticket-process kjar to KIE Server (see docs/jbpm-kalici-cozum-yol-haritasi.md)
set -eu

KIE_URL="${KIE_URL:-http://jbpm-server:8080/kie-server/services/rest/server}"
CONTAINER_ID="${JBPM_CONTAINER_ID:-destrova-ticket-process_1.0.0-SNAPSHOT}"
KIE_USER="${KIE_USER:-kieserver}"
KIE_PASS="${KIE_PASS:-kieserver1!}"

echo "Waiting for KIE Server at ${KIE_URL} ..."
ready=0
i=1
while [ "$i" -le 60 ]; do
  if curl -fsS -u "${KIE_USER}:${KIE_PASS}" "${KIE_URL}" >/dev/null 2>&1; then
    ready=1
    break
  fi
  i=$((i + 1))
  sleep 5
done
if [ "$ready" -ne 1 ]; then
  echo "KIE Server did not become ready in time" >&2
  exit 1
fi

echo "KIE Server ready; waiting for WildFly settle before deploy ..."
sleep 5

container_body() {
  curl -fsS -u "${KIE_USER}:${KIE_PASS}" "${KIE_URL}/containers/${CONTAINER_ID}" 2>/dev/null || true
}

container_started() {
  container_body | grep -q 'status=.STARTED'
}

container_exists() {
  curl -fsS -u "${KIE_USER}:${KIE_PASS}" "${KIE_URL}/containers/${CONTAINER_ID}" >/dev/null 2>&1
}

container_failed() {
  container_body | grep -q 'status=.FAILED'
}

dispose_container() {
  echo "Disposing container ${CONTAINER_ID} before redeploy ..."
  curl -sS -o /dev/null -u "${KIE_USER}:${KIE_PASS}" -X DELETE \
    "${KIE_URL}/containers/${CONTAINER_ID}" || true

  i=1
  while [ "$i" -le 20 ]; do
    if ! container_exists; then
      echo "Container ${CONTAINER_ID} removed; waiting for RuntimeManager cleanup ..."
      sleep 8
      return 0
    fi
    curl -sS -o /dev/null -u "${KIE_USER}:${KIE_PASS}" -X DELETE \
      "${KIE_URL}/containers/${CONTAINER_ID}" || true
    i=$((i + 1))
    sleep 2
  done

  echo "Container ${CONTAINER_ID} still present after dispose; waiting before redeploy ..." >&2
  sleep 10
}

deploy_payload='{
  "release-id": {
    "group-id": "com.myspace",
    "artifact-id": "destrova-ticket-process",
    "version": "1.0.0-SNAPSHOT"
  },
  "configuration": {
    "RUNTIME_STRATEGY": "SINGLETON"
  }
}'

put_deploy() {
  HTTP_CODE=$(curl -sS -o /tmp/jbpm-deploy-body -w "%{http_code}" -X PUT \
    -u "${KIE_USER}:${KIE_PASS}" \
    -H "Content-Type: application/json" \
    "${KIE_URL}/containers/${CONTAINER_ID}" \
    -d "${deploy_payload}")
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    return 0
  fi
  return 1
}

deploy_needs_retry() {
  grep -qE 'already active|RuntimeManager|already another KieContainer|Failed to create container' /tmp/jbpm-deploy-body 2>/dev/null \
    || [ "${HTTP_CODE:-}" = "400" ]
}

deploy_container() {
  attempt=1
  while [ "$attempt" -le 5 ]; do
    if put_deploy; then
      return 0
    fi
    if deploy_needs_retry; then
      echo "Deploy attempt ${attempt} hit stale RuntimeManager; disposing and retrying ..." >&2
      dispose_container
      attempt=$((attempt + 1))
      continue
    fi
    echo "Deploy failed with HTTP ${HTTP_CODE}" >&2
    cat /tmp/jbpm-deploy-body >&2
    return 1
  done
  echo "Deploy failed after ${attempt} attempts" >&2
  cat /tmp/jbpm-deploy-body >&2
  return 1
}

if container_started; then
  echo "Container ${CONTAINER_ID} already STARTED"
  exit 0
fi

if container_exists; then
  if container_failed; then
    echo "Container ${CONTAINER_ID} is FAILED; forcing dispose ..."
  fi
  dispose_container
fi

echo "Deploying container ${CONTAINER_ID} ..."
if ! deploy_container; then
  exit 1
fi

echo "Waiting for container ${CONTAINER_ID} to reach STARTED ..."
i=1
while [ "$i" -le 30 ]; do
  if container_started; then
    echo "Container ${CONTAINER_ID} is STARTED"
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done

echo "Container ${CONTAINER_ID} not STARTED after deploy" >&2
cat /tmp/jbpm-deploy-body >&2 || true
exit 1
