package com.vvmpavers.repository;

import com.vvmpavers.entity.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findByCustomerId(Long customerId);
    List<CustomerOrder> findByCustomerIdOrderByIdDesc(Long customerId);
}
