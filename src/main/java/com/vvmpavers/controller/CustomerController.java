package com.vvmpavers.controller;

import com.vvmpavers.entity.Customer;
import com.vvmpavers.entity.CustomerOrder;
import com.vvmpavers.service.CustomerOrderService;
import com.vvmpavers.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin("*")
@RestController
@RequestMapping("/customer")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private CustomerOrderService orderService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Customer customer) {
        try {
            Customer saved = customerService.register(customer);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            String token = customerService.login(email, password);
            Customer customer = customerService.getCustomerByToken(token);
            
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("name", customer.getName());
            response.put("email", customer.getEmail());
            response.put("phone", customer.getPhone());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        Customer customer = customerService.getCustomerByToken(token);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Session invalid or expired.");
        }
        return ResponseEntity.ok(customer);
    }

    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, String> request) {
        try {
            String token = extractToken(authHeader);
            Customer customer = customerService.getCustomerByToken(token);
            if (customer == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Session invalid or expired.");
            }
            String name = request.get("name");
            String phone = request.get("phone");
            String newPassword = request.get("password");
            
            customerService.updateProfile(token, name, phone, newPassword);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Profile updated successfully.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String link = customerService.forgotPassword(email);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Simulated recovery link sent successfully.");
            response.put("resetLink", link); // Return it so they can reset directly in UI
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        boolean success = customerService.resetPassword(token, newPassword);
        if (success) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password reset successfully.");
            return ResponseEntity.ok(response);
        } else {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid or expired reset token.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getOrderHistory(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        Customer customer = customerService.getCustomerByToken(token);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Session invalid or expired.");
        }
        List<CustomerOrder> orders = orderService.getOrdersByCustomerId(customer.getId());
        return ResponseEntity.ok(orders);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        customerService.logout(token);
        return ResponseEntity.ok("Logged out successfully.");
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}
