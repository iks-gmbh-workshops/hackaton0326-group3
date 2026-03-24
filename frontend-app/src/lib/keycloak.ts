import Keycloak from "keycloak-js";

let keycloakInstance: Keycloak | null = null;

function getKeycloakBaseUrl() {
  return (process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080").replace(/\/$/, "");
}

export function getKeycloakClient() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: getKeycloakBaseUrl(),
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "drumdibum",
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "drumdibum-frontend",
    });
  }

  return keycloakInstance;
}
