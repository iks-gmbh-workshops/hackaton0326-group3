package com.iks.backend.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) {
    try {
      http.csrf(csrf -> csrf.ignoringRequestMatchers("/h2-console/**", "/api/**"))
          .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
          .cors(Customizer.withDefaults())
          .authorizeHttpRequests(
              auth ->
                  auth.requestMatchers("/actuator/health", "/h2-console/**")
                      .permitAll()
                      .requestMatchers(HttpMethod.OPTIONS, "/api/**")
                      .permitAll()
                      .requestMatchers("/api/**")
                      .hasRole("REGISTERED_USER")
                      .anyRequest()
                      .authenticated())
          .oauth2Login(Customizer.withDefaults())
          .oauth2ResourceServer(
              oauth2 ->
                  oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

      return http.build();
    } catch (Exception exception) {
      throw new IllegalStateException("Failed to build security filter chain", exception);
    }
  }

  @Bean
  Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(new KeycloakRealmRoleConverter());
    return converter;
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://127.0.0.1:3000"));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
    configuration.setExposedHeaders(List.of("Location"));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
  }

  static class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private final JwtGrantedAuthoritiesConverter defaultAuthoritiesConverter =
        new JwtGrantedAuthoritiesConverter();

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
      Set<GrantedAuthority> authorities =
          new LinkedHashSet<>(defaultAuthoritiesConverter.convert(jwt));
      authorities.addAll(extractRealmRoles(jwt));
      authorities.addAll(extractClientRoles(jwt));
      return new ArrayList<>(authorities);
    }

    private Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
      Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
      return extractRoles(realmAccess);
    }

    private Collection<GrantedAuthority> extractClientRoles(Jwt jwt) {
      Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
      if (resourceAccess == null) {
        return Set.of();
      }

      Set<GrantedAuthority> authorities = new LinkedHashSet<>();
      for (Object clientConfig : resourceAccess.values()) {
        if (clientConfig instanceof Map<?, ?> clientMap) {
          authorities.addAll(extractRolesFromUnknownMap(clientMap));
        }
      }
      return authorities;
    }

    private Collection<GrantedAuthority> extractRolesFromUnknownMap(Map<?, ?> accessSection) {
      Object rolesClaim = accessSection.get("roles");
      if (!(rolesClaim instanceof Collection<?> roles)) {
        return Set.of();
      }

      Set<GrantedAuthority> authorities = new LinkedHashSet<>();
      for (Object role : roles) {
        if (role instanceof String roleName && !roleName.isBlank()) {
          authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName.toUpperCase(Locale.ROOT)));
        }
      }
      return authorities;
    }

    private Collection<GrantedAuthority> extractRoles(Map<String, Object> accessSection) {
      if (accessSection == null) {
        return Set.of();
      }

      Object rolesClaim = accessSection.get("roles");
      if (!(rolesClaim instanceof Collection<?> roles)) {
        return Set.of();
      }

      Set<GrantedAuthority> authorities = new LinkedHashSet<>();
      for (Object role : roles) {
        if (role instanceof String roleName && !roleName.isBlank()) {
          authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName.toUpperCase(Locale.ROOT)));
        }
      }
      return authorities;
    }
  }
}
