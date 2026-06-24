package com.vvmpavers.service;

import com.vvmpavers.entity.Customer;
import com.vvmpavers.repository.CustomerRepository;
import com.vvmpavers.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository repository;

    public Customer register(Customer customer) {
        Optional<Customer> existing = repository.findByEmail(customer.getEmail());
        if (existing.isPresent()) {
            throw new RuntimeException("Email address is already registered.");
        }
        customer.setPassword(PasswordUtil.hash(customer.getPassword()));
        return repository.save(customer);
    }

    public String login(String email, String password) {
        Optional<Customer> optional = repository.findByEmail(email);
        if (optional.isPresent()) {
            Customer customer = optional.get();
            if (PasswordUtil.verify(password, customer.getPassword())) {
                String token = UUID.randomUUID().toString();
                customer.setAuthToken(token);
                repository.save(customer);
                return token;
            }
        }
        throw new RuntimeException("Invalid email or password credentials.");
    }

    public Customer getCustomerByToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        return repository.findByAuthToken(token).orElse(null);
    }

    public List<Customer> getAllCustomers() {
        return repository.findAll();
    }

    public void logout(String token) {
        Optional<Customer> optional = repository.findByAuthToken(token);
        if (optional.isPresent()) {
            Customer customer = optional.get();
            customer.setAuthToken(null);
            repository.save(customer);
        }
    }

    public String forgotPassword(String email) {
        Optional<Customer> optional = repository.findByEmail(email);
        if (optional.isPresent()) {
            Customer customer = optional.get();
            String token = UUID.randomUUID().toString();
            customer.setResetToken(token);
            customer.setTokenExpiry(LocalDateTime.now().plusHours(2));
            repository.save(customer);

            // Simulation URL link
            String resetLink = "http://localhost:8081/index.html?action=resetPassword&token=" + token + "&role=customer";

            // Print to terminal
            System.out.println("\n==================================================");
            System.out.println("[SIMULATION EMAIL] Send to customer: " + email);
            System.out.println("Subject: VVM Pavers - Account Password Recovery Link");
            System.out.println("Hello " + customer.getName() + ", click the link below to reset your password:");
            System.out.println(resetLink);
            System.out.println("==================================================\n");

            // Write to local file
            writeLinkToFile("Customer", email, resetLink);

            return resetLink;
        }
        throw new RuntimeException("No customer account found with email: " + email);
    }

    public boolean resetPassword(String token, String newPassword) {
        Optional<Customer> optional = repository.findByResetToken(token);
        if (optional.isPresent()) {
            Customer customer = optional.get();
            if (customer.getTokenExpiry() != null && customer.getTokenExpiry().isAfter(LocalDateTime.now())) {
                customer.setPassword(PasswordUtil.hash(newPassword));
                customer.setResetToken(null);
                customer.setTokenExpiry(null);
                repository.save(customer);
                return true;
            }
        }
        return false;
    }

    public void updateProfile(String token, String name, String phone, String newPassword) {
        Optional<Customer> optional = repository.findByAuthToken(token);
        if (optional.isPresent()) {
            Customer customer = optional.get();
            if (name != null && !name.trim().isEmpty()) {
                customer.setName(name.trim());
            }
            if (phone != null && !phone.trim().isEmpty()) {
                customer.setPhone(phone.trim());
            }
            if (newPassword != null && !newPassword.trim().isEmpty()) {
                customer.setPassword(PasswordUtil.hash(newPassword));
            }
            repository.save(customer);
        } else {
            throw new RuntimeException("Customer session expired or invalid.");
        }
    }

    private void writeLinkToFile(String role, String email, String link) {
        try {
            File file = new File("reset_links.txt");
            FileWriter writer = new FileWriter(file, true);
            writer.write("[" + LocalDateTime.now() + "] Role: " + role + ", Email: " + email + "\n");
            writer.write("Reset Link: " + link + "\n\n");
            writer.close();
        } catch (IOException e) {
            System.err.println("Could not write reset link to file: " + e.getMessage());
        }
    }
}
