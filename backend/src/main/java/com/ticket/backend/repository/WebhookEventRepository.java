package com.ticket.backend.repository;

import com.ticket.backend.entity.WebhookProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookProcessedEvent, String> {}
