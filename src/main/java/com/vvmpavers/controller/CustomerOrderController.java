package com.vvmpavers.controller;

import com.vvmpavers.entity.Customer;
import com.vvmpavers.entity.CustomerOrder;
import com.vvmpavers.service.CustomerOrderService;
import com.vvmpavers.service.AdminService;
import com.vvmpavers.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin("*")
@RestController
@RequestMapping("/orders")
public class CustomerOrderController {

    @Autowired
    private CustomerOrderService service;

    @Autowired
    private AdminService adminService;

    @Autowired
    private CustomerService customerService;

    @GetMapping
    public ResponseEntity<?> getAllOrders(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        if (!adminService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized administrative access.");
        }
        List<CustomerOrder> list = service.getAllOrders();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> placeOrder(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody CustomerOrder order) {
        try {
            if (authHeader != null && !authHeader.isEmpty()) {
                String token = extractToken(authHeader);
                Customer customer = customerService.getCustomerByToken(token);
                if (customer != null) {
                    order.setCustomerId(customer.getId());
                }
            }
            CustomerOrder saved = service.saveOrder(order);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id, 
            @RequestParam String status) {
        String token = extractToken(authHeader);
        if (!adminService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized administrative access.");
        }
        try {
            CustomerOrder updated = service.updateOrderStatus(id, status);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}
