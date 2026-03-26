package com.iks.backend.group.api;

import com.fasterxml.jackson.annotation.JsonAlias;

public record AddGroupMemberRequest(
    @JsonAlias({"id", "memberId"}) String userId,
    @JsonAlias({"inviteEmail", "emailInvite", "userEmail", "mail"}) String email) {}
