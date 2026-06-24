package com.vvmpavers.controller;

import com.vvmpavers.entity.CompletedProject;
import com.vvmpavers.repository.CompletedProjectRepository;
import com.vvmpavers.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@CrossOrigin("*")
@RestController
@RequestMapping("/projects")
public class CompletedProjectController {

    @Autowired
    private CompletedProjectRepository repository;

    @Autowired
    private AdminService adminService;

    @GetMapping
    public List<CompletedProject> getAllProjects() {
        return repository.findAllByOrderByIdDesc();
    }

    @PostMapping
    public ResponseEntity<?> addProject(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody CompletedProject project) {
        String token = extractToken(authHeader);
        if (!adminService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized administrative access.");
        }
        CompletedProject saved = repository.save(project);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProject(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody CompletedProject updatedProject) {
        String token = extractToken(authHeader);
        if (!adminService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized administrative access.");
        }
        Optional<CompletedProject> optional = repository.findById(id);
        if (optional.isPresent()) {
            CompletedProject project = optional.get();
            project.setTitle(updatedProject.getTitle());
            project.setDescription(updatedProject.getDescription());
            project.setImageUrl(updatedProject.getImageUrl());
            CompletedProject saved = repository.save(project);
            return ResponseEntity.ok(saved);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found with id: " + id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        String token = extractToken(authHeader);
        if (!adminService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized administrative access.");
        }
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok("Project deleted successfully.");
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found with id: " + id);
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}
