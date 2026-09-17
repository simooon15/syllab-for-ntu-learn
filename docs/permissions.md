# Manifest permission rationale

| Permission                          | Scope                    | Phase 1 purpose                                                                                                                                                                          |
| ----------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                           | Extension                | Persist schema version and, in later phases, resumable local state.                                                                                                                      |
| `activeTab`                         | User-selected active tab | Read the current tab context only when the user opens or invokes Syllab.                                                                                                                 |
| `scripting`                         | Extension                | Inject the controlled page bridge when a Blackboard page-context read is required.                                                                                                       |
| `webRequest`                        | Read-only request events | Observe the redirect destination of a discovered NTU WebDAV attachment request. It does not grant a host; listeners are scoped to the exact discovered path and raw URLs are not logged. |
| `offscreen`                         | Hidden extension page    | Host a short-lived, packaged parser document that starts one isolated Worker per file. It has no visible UI and receives no additional site permission.                                  |
| `https://ntulearn.ntu.edu.sg/*`     | Granted host             | Load the read-only content script on the target NTU Learn site.                                                                                                                          |
| Optional Blackboard/Xythos patterns | Not granted at install   | Make a later runtime request possible; the request itself must contain only the exact discovered origin and be triggered by an explicit user gesture.                                    |

No broad Blackboard host permission is granted at installation. Optional permissions are requested
only for an exact redirect origin discovered during an active Scan and only from a Popup user gesture.
