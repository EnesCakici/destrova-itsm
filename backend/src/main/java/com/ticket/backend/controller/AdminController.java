package com.ticket.backend.controller;

import com.ticket.backend.entity.Product;
import com.ticket.backend.enums.Status;
import com.ticket.backend.repository.TicketRepository;
import com.ticket.backend.service.ProductService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final ProductService productService;
    private final TicketRepository ticketRepository;

    @GetMapping("/products")
    public List<Product> listProducts() {
        return productService.getAllProducts();
    }

    @PostMapping("/products")
    public Product createProduct(@RequestBody Product body) {
        return productService.createProduct(body);
    }

    @PutMapping("/products/{id}")
    public Product updateProduct(@PathVariable Long id, @RequestBody Product body) {
        return productService.updateProduct(id, body);
    }

    /** CLOSED dışındaki tüm talepler (NEW, IN_PROGRESS, WAITING_FOR_CUSTOMER, RESOLVED). */
    @GetMapping("/overview/tickets")
    public Map<String, Long> getActiveTicketCount() {
        long count = ticketRepository.countByStatusIn(
                List.of(Status.NEW, Status.IN_PROGRESS, Status.WAITING_FOR_CUSTOMER, Status.RESOLVED));
        return Map.of("activeTickets", count);
    }
}
