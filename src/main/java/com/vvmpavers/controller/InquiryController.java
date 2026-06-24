package com.vvmpavers.controller;

import com.vvmpavers.entity.Inquiry;
import com.vvmpavers.service.InquiryService;
import com.vvmpavers.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin("*")
@RestController
@RequestMapping("/inquiries")
public class InquiryController {

    @Autowired
    private InquiryService service;

    @Autowired
    private AdminService adminService;

    @PostMapping
    public ResponseEntity<?> saveInquiry(@RequestBody Inquiry inquiry) {
        try {
            Inquiry saved = service.saveInquiry(inquiry);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllInquiries(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        if (!adminService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized administrative access.");
        }
        List<Inquiry> list = service.getAllInquiries();
        return ResponseEntity.ok(list);
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}