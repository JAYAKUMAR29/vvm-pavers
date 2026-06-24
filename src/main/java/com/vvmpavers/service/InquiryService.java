package com.vvmpavers.service;

import com.vvmpavers.entity.Inquiry;
import com.vvmpavers.repository.InquiryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InquiryService {

    @Autowired
    private InquiryRepository repository;

    public Inquiry saveInquiry(Inquiry inquiry) {
        return repository.save(inquiry);
    }

    public List<Inquiry> getAllInquiries() {
        return repository.findAll();
    }
}