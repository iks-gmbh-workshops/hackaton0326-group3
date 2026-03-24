package com.iks.backend.user.api;

import java.util.List;

import com.iks.backend.user.UserLookupResult;
import com.iks.backend.user.UserService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserLookupResponse> searchUsers(
        @RequestParam(value = "query", required = false) String query,
        @RequestParam(value = "name", required = false) String name,
        @RequestParam(value = "email", required = false) String email
    ) {
        return userService.searchByNameOrEmail(firstNonBlank(query, name, email)).stream()
            .map(UserController::toResponse)
            .toList();
    }

    private static UserLookupResponse toResponse(UserLookupResult user) {
        return new UserLookupResponse(
            user.id(),
            user.name(),
            user.email()
        );
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return null;
    }
}
