package com.vvmpavers.util;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

public class PasswordUtil {

    public static String hash(String password) {
        SecureRandom sr = new SecureRandom();
        byte[] salt = new byte[16];
        sr.nextBytes(salt);
        String saltStr = Base64.getEncoder().encodeToString(salt);
        
        String hashStr = hashWithSalt(password, saltStr);
        return saltStr + ":" + hashStr;
    }

    public static boolean verify(String password, String storedPasswordHash) {
        if (storedPasswordHash == null || !storedPasswordHash.contains(":")) {
            // Support simple plain text checking for seeding defaults if needed
            if (storedPasswordHash != null && storedPasswordHash.equals(password)) {
                return true;
            }
            return false;
        }
        String[] parts = storedPasswordHash.split(":");
        if (parts.length != 2) {
            return false;
        }
        String saltStr = parts[0];
        String storedHash = parts[1];
        
        String newHash = hashWithSalt(password, saltStr);
        return newHash.equals(storedHash);
    }

    private static String hashWithSalt(String password, String saltStr) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(Base64.getDecoder().decode(saltStr));
            byte[] hash = md.digest(password.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }
}
