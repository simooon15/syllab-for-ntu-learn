// Phase 1 boundary only. Later phases may add a narrow, read-only Blackboard API bridge here.
window.dispatchEvent(
  new CustomEvent("syllab:page-bridge-ready", {
    detail: { version: "0.1.0", capabilities: [] }
  })
);
