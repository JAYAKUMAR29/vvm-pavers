package com.vvmpavers.service;

import com.vvmpavers.entity.CustomerOrder;
import com.vvmpavers.repository.CustomerOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CustomerOrderService {

    @Autowired
    private CustomerOrderRepository repository;

    public List<CustomerOrder> getAllOrders() {
        return repository.findAll();
    }

    public CustomerOrder saveOrder(CustomerOrder order) {
        return repository.save(order);
    }

    public List<CustomerOrder> getOrdersByCustomerId(Long customerId) {
        return repository.findByCustomerIdOrderByIdDesc(customerId);
    }

    public CustomerOrder updateOrderStatus(Long id, String status) {
        Optional<CustomerOrder> optionalOrder = repository.findById(id);
        if (optionalOrder.isPresent()) {
            CustomerOrder order = optionalOrder.get();
            order.setOrderStatus(status);
            return repository.save(order);
        }
        throw new RuntimeException("Order not found with id: " + id);
    }
}
