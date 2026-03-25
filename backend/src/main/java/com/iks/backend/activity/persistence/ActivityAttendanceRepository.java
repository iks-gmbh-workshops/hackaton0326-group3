package com.iks.backend.activity.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityAttendanceRepository extends JpaRepository<ActivityAttendance, String> {

    List<ActivityAttendance> findByActivityId(String activityId);

    Optional<ActivityAttendance> findByActivityIdAndUserId(String activityId, String userId);
}
