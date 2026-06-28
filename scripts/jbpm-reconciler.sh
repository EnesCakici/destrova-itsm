#!/bin/sh
# Keeps KIE deployment container STARTED after jbpm-server restarts (see docs/jbpm-kalici-cozum-yol-haritasi.md)
set -eu

KIE_URL="${KIE_URL:-http://jbpm-server:8080/kie-server/services/rest/server}"
CONTAINER_ID="${JBPM_CONTAINER_ID:-destrova-ticket-process_1.0.0-SNAPSHOT}"
KIE_USER="${KIE_USER:-kieserver}"
KIE_PASS="${KIE_PASS:-kieserver1!}"
INTERVAL="${JBPM_RECONCILE_INTERVAL:-30}"

container_started() {
  curl -fsS -u "${KIE_USER}:${KIE_PASS}" "${KIE_URL}/containers/${CONTAINER_ID}" 2>/dev/null \
    | grep -q 'status=.STARTED'
}

echo "jbpm-reconciler: watching ${CONTAINER_ID} every ${INTERVAL}s"

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
  echo "KIE Server did not become ready; reconciler will keep retrying" >&2
fi

INIT_GRACE_SEC="${JBPM_INIT_GRACE_SEC:-90}"
echo "Grace period ${INIT_GRACE_SEC}s for jbpm-init before reconciler deploys ..."
elapsed=0
while [ "$elapsed" -lt "$INIT_GRACE_SEC" ]; do
  if container_started; then
    echo "Container ${CONTAINER_ID} already STARTED (jbpm-init succeeded)"
    break
  fi
  elapsed=$((elapsed + 5))
  sleep 5
done

while true; do
  if container_started; then
    :
  else
    echo "Container ${CONTAINER_ID} missing or not STARTED — redeploying..."
    if /bin/sh /jbpm-deploy.sh; then
      echo "Redeploy succeeded"
    else
      echo "Redeploy failed; will retry in ${INTERVAL}s" >&2
    fi
  fi
  sleep "${INTERVAL}"
done
