package com.iks.backend.activity.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityRepository extends JpaRepository<Activity, String> {

    List<Activity> findByGroupIdOrderByScheduledAtAsc(String groupId);
}
