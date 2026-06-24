package com.vvmpavers.service;

import com.vvmpavers.entity.Admin;
import com.vvmpavers.repository.AdminRepository;
import com.vvmpavers.util.PasswordUtil;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AdminService {

    @Autowired
    private AdminRepository repository;

    @PostConstruct
    public void init() {
        // Seed default admin account if table is empty
        if (repository.count() == 0) {
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setPassword(PasswordUtil.hash("admin123"));
            admin.setEmail("admin@vvmpavers.com");
            repository.save(admin);
            System.out.println("==================================================");
            System.out.println("VVM PAVERS: Seeded default administrator account.");
            System.out.println("Username: admin");
            System.out.println("Password: admin123");
            System.out.println("==================================================");
        }
    }

    public String login(String username, String password) {
        Optional<Admin> optional = repository.findByUsername(username);
        if (optional.isPresent()) {
            Admin admin = optional.get();
            if (PasswordUtil.verify(password, admin.getPassword())) {
                String token = UUID.randomUUID().toString();
                admin.setAuthToken(token);
                repository.save(admin);
                return token;
            }
        }
        throw new RuntimeException("Invalid administrative credentials.");
    }

    public boolean validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }
        return repository.findByAuthToken(token).isPresent();
    }

    public void logout(String token) {
        Optional<Admin> optional = repository.findByAuthToken(token);
        if (optional.isPresent()) {
            Admin admin = optional.get();
            admin.setAuthToken(null);
            repository.save(admin);
        }
    }

    public String forgotPassword(String email) {
        Optional<Admin> optional = repository.findByEmail(email);
        if (optional.isPresent()) {
            Admin admin = optional.get();
            String token = UUID.randomUUID().toString();
            admin.setResetToken(token);
            admin.setTokenExpiry(LocalDateTime.now().plusHours(2));
            repository.save(admin);

            // Simulation URL link
            String resetLink = "http://localhost:8081/index.html?action=resetPassword&token=" + token + "&role=admin";

            // Print to backend terminal
            System.out.println("\n==================================================");
            System.out.println("[SIMULATION EMAIL] Send to: " + email);
            System.out.println("Subject: VVM Pavers - Admin Password Recovery Link");
            System.out.println("Hello Administrator, click the link below to reset your password:");
            System.out.println(resetLink);
            System.out.println("==================================================\n");

            // Write to a local file
            writeLinkToFile("Admin", email, resetLink);

            return resetLink;
        }
        throw new RuntimeException("No administrator registered with email: " + email);
    }

    public boolean resetPassword(String token, String newPassword) {
        Optional<Admin> optional = repository.findByResetToken(token);
        if (optional.isPresent()) {
            Admin admin = optional.get();
            if (admin.getTokenExpiry() != null && admin.getTokenExpiry().isAfter(LocalDateTime.now())) {
                admin.setPassword(PasswordUtil.hash(newPassword));
                admin.setResetToken(null);
                admin.setTokenExpiry(null);
                repository.save(admin);
                return true;
            }
        }
        return false;
    }

    public void updateProfile(String token, String newUsername, String newEmail, String newPassword) {
        Optional<Admin> optional = repository.findByAuthToken(token);
        if (optional.isPresent()) {
            Admin admin = optional.get();
            if (newUsername != null && !newUsername.trim().isEmpty()) {
                admin.setUsername(newUsername.trim());
            }
            if (newEmail != null && !newEmail.trim().isEmpty()) {
                admin.setEmail(newEmail.trim());
            }
            if (newPassword != null && !newPassword.trim().isEmpty()) {
                admin.setPassword(PasswordUtil.hash(newPassword));
            }
            repository.save(admin);
        } else {
            throw new RuntimeException("Invalid session authorization.");
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
