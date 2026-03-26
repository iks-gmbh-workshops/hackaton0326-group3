package com.iks.backend.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

  private static final Logger log = LoggerFactory.getLogger(EmailService.class);

  private final JavaMailSender mailSender;
  private final String fromAddress;

  public EmailService(JavaMailSender mailSender, @Value("${spring.mail.from}") String fromAddress) {
    this.mailSender = mailSender;
    this.fromAddress = fromAddress;
  }

  @Async
  public void sendEmail(String to, String subject, String htmlBody) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(fromAddress);
      helper.setTo(to);
      helper.setSubject(subject);
      helper.setText(htmlBody, true);
      mailSender.send(message);
      log.info("Email sent to {}: {}", to, subject);
    } catch (MessagingException e) {
      log.error("Failed to send email to {}: {}", to, e.getMessage(), e);
    }
  }

  @Async
  public void sendEmailToMany(List<String> recipients, String subject, String htmlBody) {
    for (String recipient : recipients) {
      sendEmail(recipient, subject, htmlBody);
    }
  }
}
