package com.iks.backend.keycloak;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "keycloak.admin")
public class KeycloakAdminProperties {

  private String baseUrl;
  private String realm;
  private String clientId;
  private String clientSecret;
  private String inviteClientId = "drumdibum-frontend";
  private int inviteActionsLifespanSeconds = 86400;

  @PostConstruct
  void validate() {
    requireValue(baseUrl, "keycloak.admin.base-url");
    requireValue(realm, "keycloak.admin.realm");
    requireValue(clientId, "keycloak.admin.client-id");
    requireValue(clientSecret, "keycloak.admin.client-secret");
  }

  private static void requireValue(String value, String propertyName) {
    if (value == null || value.isBlank()) {
      throw new IllegalStateException("Missing required property: " + propertyName);
    }
  }

  public String getBaseUrl() {
    return baseUrl;
  }

  public void setBaseUrl(String baseUrl) {
    this.baseUrl = baseUrl;
  }

  public String getRealm() {
    return realm;
  }

  public void setRealm(String realm) {
    this.realm = realm;
  }

  public String getClientId() {
    return clientId;
  }

  public void setClientId(String clientId) {
    this.clientId = clientId;
  }

  public String getClientSecret() {
    return clientSecret;
  }

  public void setClientSecret(String clientSecret) {
    this.clientSecret = clientSecret;
  }

  public String getInviteClientId() {
    return inviteClientId;
  }

  public void setInviteClientId(String inviteClientId) {
    this.inviteClientId = inviteClientId;
  }

  public int getInviteActionsLifespanSeconds() {
    return inviteActionsLifespanSeconds;
  }

  public void setInviteActionsLifespanSeconds(int inviteActionsLifespanSeconds) {
    this.inviteActionsLifespanSeconds = inviteActionsLifespanSeconds;
  }
}
