package com.iks.backend.group.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppGroupRepository extends JpaRepository<AppGroup, String> {

    boolean existsByNameIgnoreCase(String name);
}
