import { useEffect, useState } from "react";

export function useAuth() {
	const [loggedIn, setLoggedIn] = useState(false);
	const [token, setToken] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		chrome.storage.local.get(["token"], async (result) => {
			if (result.token) {
				setLoggedIn(true);
				setToken(result.token);

				setIsLoading(false);
			}
		});
	}, []);

	return { loggedIn, token, isLoading };
}
