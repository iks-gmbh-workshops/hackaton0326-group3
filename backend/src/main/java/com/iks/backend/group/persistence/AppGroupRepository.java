package com.iks.backend.group.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppGroupRepository extends JpaRepository<AppGroup, String> {

    boolean existsByNameIgnoreCase(String name);

    List<AppGroup> findByOwnerId(String ownerId);
}
