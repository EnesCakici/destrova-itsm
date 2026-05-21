package com.ticket.backend.service;

import com.ticket.backend.entity.Product;
import com.ticket.backend.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Transactional
    public Product createProduct(Product product) {
        validateName(product.getName());
        product.setId(null);
        if (product.getIsActive() == null) {
            product.setIsActive(Boolean.TRUE);
        }
        return productRepository.save(product);
    }

    @Transactional
    public Product updateProduct(Long id, Product update) {
        validateName(update.getName());
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        existing.setName(update.getName().trim());
        existing.setDescription(update.getDescription());
        existing.setCategory(update.getCategory());
        existing.setLatestVersion(update.getLatestVersion());
        if (update.getIsActive() != null) {
            existing.setIsActive(update.getIsActive());
        }
        return productRepository.save(existing);
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
    }
}
