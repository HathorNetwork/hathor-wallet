export const historyUpdate = (data) => ({ type: "history_update", payload: data });

export const reloadData = data => ({ type: "reload_data", payload: data });

export const cleanData = () => ({ type: "clean_data" });

export const sharedAddressUpdate = data => ({ type: "shared_address", payload: data });

export const isVersionAllowedUpdate = data => ({ type: "is_version_allowed_update", payload: data });

export const isOnlineUpdate = data => ({ type: "is_online_update", payload: data });

export const lastFailedRequest = data => ({ type: "last_failed_request", payload: data });

export const updatePassword = data => ({ type: "update_password", payload: data });

export const updatePin = data => ({ type: "update_pin", payload: data });

export const updateWords = data => ({ type: "update_words", payload: data });

export const selectToken = data => ({ type: "select_token", payload: data });

export const newTokens = data => ({ type: "new_tokens", payload: data });
