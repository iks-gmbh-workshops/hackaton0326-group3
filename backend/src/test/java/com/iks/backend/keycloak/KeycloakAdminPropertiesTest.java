package com.iks.backend.keycloak;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class KeycloakAdminPropertiesTest {

  @Test
  void validateAcceptsCompleteConfiguration() {
    KeycloakAdminProperties properties = new KeycloakAdminProperties();
    properties.setBaseUrl("http://localhost:8080");
    properties.setRealm("drumdibum");
    properties.setClientId("backend");
    properties.setClientSecret("secret");

    properties.validate();

    assertThat(properties.getInviteClientId()).isEqualTo("drumdibum-frontend");
    assertThat(properties.getInviteActionsLifespanSeconds()).isEqualTo(86400);
  }

  @Test
  void validateRejectsMissingBaseUrl() {
    KeycloakAdminProperties properties = validProperties();
    properties.setBaseUrl("   ");

    assertThatThrownBy(properties::validate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("keycloak.admin.base-url");
  }

  @Test
  void validateRejectsMissingRealm() {
    KeycloakAdminProperties properties = validProperties();
    properties.setRealm(null);

    assertThatThrownBy(properties::validate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("keycloak.admin.realm");
  }

  @Test
  void validateRejectsMissingClientId() {
    KeycloakAdminProperties properties = validProperties();
    properties.setClientId(" ");

    assertThatThrownBy(properties::validate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("keycloak.admin.client-id");
  }

  @Test
  void validateRejectsMissingClientSecret() {
    KeycloakAdminProperties properties = validProperties();
    properties.setClientSecret("");

    assertThatThrownBy(properties::validate)
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("keycloak.admin.client-secret");
  }

  private static KeycloakAdminProperties validProperties() {
    KeycloakAdminProperties properties = new KeycloakAdminProperties();
    properties.setBaseUrl("http://localhost:8080");
    properties.setRealm("drumdibum");
    properties.setClientId("backend");
    properties.setClientSecret("secret");
    return properties;
  }
}
