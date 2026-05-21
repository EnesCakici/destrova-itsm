package com.ticket.backend.repository;

import com.ticket.backend.entity.Comment;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query(
            """
            select c from Comment c join fetch c.ticket t
            where c.isInternal = true
              and lower(c.message) like lower(concat('%@', :email, '%'))
            """)
    List<Comment> findInternalCommentsForPotentialEmailMention(@Param("email") String email);

    List<Comment> findByAuthorUserIdAndCreatedAtBetween(
            Long authorUserId,
            LocalDateTime start,
            LocalDateTime end
    );
}