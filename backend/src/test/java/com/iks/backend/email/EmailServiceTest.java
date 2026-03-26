package com.iks.backend.email;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Address;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

  @Mock private JavaMailSender mailSender;

  private MimeMessage mimeMessage;
  private Logger emailServiceLogger;
  private Level previousLogLevel;

  @BeforeEach
  void setUp() {
    mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
    when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

    emailServiceLogger = (Logger) LoggerFactory.getLogger(EmailService.class);
    previousLogLevel = emailServiceLogger.getLevel();
    emailServiceLogger.setLevel(Level.OFF);
  }

  @AfterEach
  void tearDown() {
    if (emailServiceLogger != null) {
      emailServiceLogger.setLevel(previousLogLevel);
    }
  }

  @Test
  void sendEmailCreatesAndSendsMimeMessage() {
    EmailService emailService = new EmailService(mailSender, "no-reply@example.com");

    emailService.sendEmail("user@example.com", "Welcome", "<b>Hello</b>");

    verify(mailSender).send(mimeMessage);
  }

  @Test
  void sendEmailHandlesMessagingExceptionWithoutRethrowing() throws Exception {
    MimeMessage brokenMessage = mock(MimeMessage.class);
    when(mailSender.createMimeMessage()).thenReturn(brokenMessage);
    doThrow(new MessagingException("mocked from-address failure"))
        .when(brokenMessage)
        .setFrom(any(Address.class));

    EmailService emailService = new EmailService(mailSender, "no-reply@example.com");

    emailService.sendEmail("user@example.com", "Welcome", "<b>Hello</b>");

    verify(mailSender, never()).send(any(MimeMessage.class));
  }

  @Test
  void sendEmailToManySendsOneMessagePerRecipient() {
    EmailService emailService = new EmailService(mailSender, "no-reply@example.com");
    when(mailSender.createMimeMessage())
        .thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));

    emailService.sendEmailToMany(List.of("a@example.com", "b@example.com"), "Subject", "Body");

    verify(mailSender, times(2)).send(any(MimeMessage.class));
  }
}
