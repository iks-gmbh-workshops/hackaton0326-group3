package com.iks.backend.user;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserNotificationRepository extends JpaRepository<UserNotification, String> {

  List<UserNotification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);

  @Modifying
  @Query(
      """
        update UserNotification n
        set n.read = true, n.readAt = :readAt
        where n.id in :ids and n.read = false
        """)
  int markAsReadByIds(@Param("ids") List<String> ids, @Param("readAt") Instant readAt);

  long deleteByUserId(String userId);
}
