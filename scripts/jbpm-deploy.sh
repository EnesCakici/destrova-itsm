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

container_started() {
  curl -fsS -u "${KIE_USER}:${KIE_PASS}" "${KIE_URL}/containers/${CONTAINER_ID}" 2>/dev/null \
    | grep -q 'status=.STARTED'
}

container_exists() {
  curl -fsS -u "${KIE_USER}:${KIE_PASS}" "${KIE_URL}/containers/${CONTAINER_ID}" >/dev/null 2>&1
}

dispose_container() {
  echo "Disposing container ${CONTAINER_ID} before redeploy ..."
  curl -sS -o /dev/null -u "${KIE_USER}:${KIE_PASS}" -X DELETE \
    "${KIE_URL}/containers/${CONTAINER_ID}" || true
  sleep 2
}

deploy_container() {
  HTTP_CODE=$(curl -sS -o /tmp/jbpm-deploy-body -w "%{http_code}" -X PUT \
    -u "${KIE_USER}:${KIE_PASS}" \
    -H "Content-Type: application/json" \
    "${KIE_URL}/containers/${CONTAINER_ID}" \
    -d '{
      "release-id": {
        "group-id": "com.myspace",
        "artifact-id": "destrova-ticket-process",
        "version": "1.0.0-SNAPSHOT"
      },
      "configuration": {
        "RUNTIME_STRATEGY": "SINGLETON"
      }
    }')
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    return 0
  fi
  if grep -q 'already another KieContainer' /tmp/jbpm-deploy-body 2>/dev/null; then
    dispose_container
    HTTP_CODE=$(curl -sS -o /tmp/jbpm-deploy-body -w "%{http_code}" -X PUT \
      -u "${KIE_USER}:${KIE_PASS}" \
      -H "Content-Type: application/json" \
      "${KIE_URL}/containers/${CONTAINER_ID}" \
      -d '{
        "release-id": {
          "group-id": "com.myspace",
          "artifact-id": "destrova-ticket-process",
          "version": "1.0.0-SNAPSHOT"
        },
        "configuration": {
          "RUNTIME_STRATEGY": "SINGLETON"
        }
      }')
    [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]
    return $?
  fi
  echo "Deploy failed with HTTP ${HTTP_CODE}" >&2
  cat /tmp/jbpm-deploy-body >&2
  return 1
}

if container_started; then
  echo "Container ${CONTAINER_ID} already STARTED"
  exit 0
fi

if container_exists; then
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
