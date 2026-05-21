package com.ticket.backend.repository;

import com.ticket.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByIsActiveTrue();
    // Temel CRUD islemleri JpaRepository uzerinden otomatik gelir.
}
