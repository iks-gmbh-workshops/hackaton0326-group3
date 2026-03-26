package com.iks.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

class SecurityConfigTest {

  @Test
  void keycloakRealmRoleConverterCombinesScopesRealmAndClientRolesWithoutDuplicates() {
    SecurityConfig.KeycloakRealmRoleConverter converter = new SecurityConfig.KeycloakRealmRoleConverter();

    Map<String, Object> resourceAccess = new LinkedHashMap<>();
    resourceAccess.put("frontend", Map.of("roles", List.of("group_admin", "registered_user")));
    resourceAccess.put("invalid-1", "not-a-map");
    resourceAccess.put("invalid-2", Map.of("roles", "not-a-list"));

    Jwt jwt =
        Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("scope", "openid profile")
            .claim("realm_access", Map.of("roles", List.of("registered_user", " ")))
            .claim("resource_access", resourceAccess)
            .build();

    List<String> authorities =
        converter.convert(jwt).stream().map(GrantedAuthority::getAuthority).toList();

    assertThat(authorities)
        .contains("SCOPE_openid", "SCOPE_profile", "ROLE_REGISTERED_USER", "ROLE_GROUP_ADMIN");
    assertThat(authorities.stream().filter("ROLE_REGISTERED_USER"::equals).count()).isEqualTo(1);
  }

  @Test
  void keycloakRealmRoleConverterHandlesMissingClaims() {
    SecurityConfig.KeycloakRealmRoleConverter converter = new SecurityConfig.KeycloakRealmRoleConverter();

    Jwt jwt = Jwt.withTokenValue("token").header("alg", "none").claim("scope", "openid").build();

    List<String> authorities =
        converter.convert(jwt).stream().map(GrantedAuthority::getAuthority).toList();

    assertThat(authorities).containsExactly("SCOPE_openid");
  }

  @Test
  void jwtAuthenticationConverterUsesCustomRoleExtraction() {
    SecurityConfig config = new SecurityConfig();
    Converter<Jwt, ? extends AbstractAuthenticationToken> converter = config.jwtAuthenticationConverter();

    Jwt jwt =
        Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("scope", "openid")
            .claim("realm_access", Map.of("roles", List.of("registered_user")))
            .build();

    AbstractAuthenticationToken token = converter.convert(jwt);

    assertThat(token).isNotNull();
    assertThat(token.getAuthorities().stream().map(GrantedAuthority::getAuthority))
        .contains("ROLE_REGISTERED_USER", "SCOPE_openid");
  }

  @Test
  void corsConfigurationSourceRegistersExpectedApiCorsRules() {
    SecurityConfig config = new SecurityConfig();

    UrlBasedCorsConfigurationSource source =
        (UrlBasedCorsConfigurationSource) config.corsConfigurationSource();
    CorsConfiguration apiConfig = source.getCorsConfigurations().get("/api/**");

    assertThat(apiConfig).isNotNull();
    assertThat(apiConfig.getAllowedOrigins())
        .containsExactly("http://localhost:3000", "http://127.0.0.1:3000");
    assertThat(apiConfig.getAllowedMethods())
        .containsExactly("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    assertThat(apiConfig.getAllowedHeaders()).containsExactly("Authorization", "Content-Type", "Accept");
    assertThat(apiConfig.getExposedHeaders()).containsExactly("Location");
    assertThat(source.getCorsConfigurations()).containsOnlyKeys("/api/**");
  }
}
