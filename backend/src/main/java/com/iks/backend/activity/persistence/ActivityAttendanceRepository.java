package com.iks.backend.activity.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActivityAttendanceRepository extends JpaRepository<ActivityAttendance, String> {

    List<ActivityAttendance> findByActivityId(String activityId);

    Optional<ActivityAttendance> findByActivityIdAndUserId(String activityId, String userId);

    @Query("SELECT aa FROM ActivityAttendance aa WHERE aa.userId = :userId AND aa.status IN ('ACCEPTED', 'MAYBE')")
    List<ActivityAttendance> findAcceptedByUserId(@Param("userId") String userId);

    long deleteByUserId(String userId);
}
