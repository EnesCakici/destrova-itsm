package com.ticket.backend.config;

import com.ticket.backend.entity.Product;
import com.ticket.backend.entity.User;
import com.ticket.backend.enums.UserRole;
import com.ticket.backend.repository.ProductRepository;
import com.ticket.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Bean
    public CommandLineRunner seedUsers() {
        return args -> {
            if (userRepository.count() > 0) return;
            userRepository.save(User.builder().name("Enes Cakici").role(UserRole.AGENT).maxTicketLimit(5).build());
            userRepository.save(User.builder().name("Mert Celik").role(UserRole.AGENT).maxTicketLimit(5).build());
            userRepository.save(User.builder().name("Melis Kurt").role(UserRole.AGENT).maxTicketLimit(5).build());
            userRepository.save(User.builder().name("Ahmet Yilmaz").role(UserRole.AGENT).maxTicketLimit(5).build());
        };
    }

    @Bean
    public CommandLineRunner seedProducts() {
        return args -> {
            if (productRepository.count() > 0) return;

            productRepository.save(Product.builder()
                    .name("Destrova Identity & Access Manager")
                    .category("Identity")
                    .description("Tek oturum açma (SSO), çok faktörlü kimlik doğrulama (MFA) ve rol tabanlı erişim kontrolü (RBAC) sağlayan kurumsal kimlik yönetim platformu.")
                    .latestVersion("v2.5.0")
                    .isActive(true)
                    .build());

            productRepository.save(Product.builder()
                    .name("Destrova Endpoint Security Suite")
                    .category("Security")
                    .description("Antivirüs, cihaz güvenlik duvarı, tehdit istihbaratı ve VPN bağlantı güvenliğini kapsayan kurumsal siber güvenlik paketi.")
                    .latestVersion("v10.5.2")
                    .isActive(true)
                    .build());

            productRepository.save(Product.builder()
                    .name("Destrova Workspace & Mail Suite")
                    .category("Productivity & Communication")
                    .description("Kurumsal e-posta sunucusu, takvim yönetimi, anlık mesajlaşma ve dosya paylaşım platformu.")
                    .latestVersion("v6.0.0")
                    .isActive(true)
                    .build());

            productRepository.save(Product.builder()
                    .name("Other & Uncategorized")
                    .category("Other")
                    .description("Katalogda tanımlı olmayan ürün, hizmet veya yazılımlar için bildirilen teknik sorunlar ve talepler.")
                    .latestVersion(null)
                    .isActive(true)
                    .build());
        };
    }
}
