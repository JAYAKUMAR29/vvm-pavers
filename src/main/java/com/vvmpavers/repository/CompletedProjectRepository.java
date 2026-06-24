package com.vvmpavers.repository;

import com.vvmpavers.entity.CompletedProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompletedProjectRepository extends JpaRepository<CompletedProject, Long> {
    List<CompletedProject> findAllByOrderByIdDesc();
}
