package com.ticket.backend.controller;
// Product entity (veritabanı tablosu)
import com.ticket.backend.entity.Product;
// Service katmanı (iş mantığı burada)
import com.ticket.backend.service.TicketService;
import java.util.List;
// Lombok: constructor oluşturur
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


// Bu sınıf bir REST API controller
@RestController
// Tüm endpointlerin başlangıç yolu
@RequestMapping("/api/products")
@Tag(name = "Products", description = "Product catalog endpoints")
@RequiredArgsConstructor
public class ProductController {

    // Urun verisini service katmanindan ceker.
    private final TicketService ticketService;

    // Ticket formundaki urun dropdown'u icin tum urunleri doner.
    // Amaç: tüm ürünleri getirmek
    @GetMapping
    @Operation(summary = "List active products", description = "Returns active products for ticket form dropdown")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public List<Product> getAllProducts() {
        return ticketService.getActiveProducts();
}
}

