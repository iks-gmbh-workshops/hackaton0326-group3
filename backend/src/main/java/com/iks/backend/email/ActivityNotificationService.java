package com.iks.backend.email;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

import com.iks.backend.activity.persistence.Activity;
import com.iks.backend.activity.persistence.AttendanceStatus;
import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.keycloak.KeycloakService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ActivityNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ActivityNotificationService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final EmailService emailService;
    private final KeycloakService keycloakService;
    private final String frontendBaseUrl;

    public ActivityNotificationService(
        EmailService emailService,
        KeycloakService keycloakService,
        @Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl
    ) {
        this.emailService = emailService;
        this.keycloakService = keycloakService;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
    }

    public void notifyActivityCreated(Activity activity, AppGroup group, String creatorUserId) {
        List<UserRepresentation> members = keycloakService.listGroupMembers(group.getId());
        String activityLink = buildActivityLink(activity);

        String subject = "New Activity: " + activity.getTitle() + " in " + group.getName();
        String dateStr = activity.getScheduledAt().format(DATE_FMT);
        String timeStr = activity.getScheduledAt().format(TIME_FMT);

        String htmlBody = "<h2>New Activity Created</h2>"
            + "<p>A new activity has been created in <strong>" + escapeHtml(group.getName()) + "</strong>.</p>"
            + "<table style=\"border-collapse:collapse;margin:16px 0\">"
            + "<tr><td style=\"padding:4px 12px 4px 0;font-weight:bold\">Title</td><td>" + escapeHtml(activity.getTitle()) + "</td></tr>"
            + "<tr><td style=\"padding:4px 12px 4px 0;font-weight:bold\">Date</td><td>" + dateStr + "</td></tr>"
            + "<tr><td style=\"padding:4px 12px 4px 0;font-weight:bold\">Time</td><td>" + timeStr + "</td></tr>"
            + (activity.getLocation() != null ? "<tr><td style=\"padding:4px 12px 4px 0;font-weight:bold\">Location</td><td>" + escapeHtml(activity.getLocation()) + "</td></tr>" : "")
            + (activity.getDescription() != null ? "<tr><td style=\"padding:4px 12px 4px 0;font-weight:bold\">Description</td><td>" + escapeHtml(activity.getDescription()) + "</td></tr>" : "")
            + "</table>"
            + "<p><a href=\"" + escapeHtml(activityLink) + "\">Open activity</a> to view details and respond.</p>";

        List<String> emails = members.stream()
            .filter(member -> !Objects.equals(member.getId(), creatorUserId))
            .filter(member -> Boolean.TRUE.equals(member.isEmailVerified()))
            .map(member -> firstNonBlank(member.getEmail(), member.getUsername()))
            .filter(email -> email != null && !email.isBlank())
            .distinct()
            .toList();

        log.info("Sending activity creation notification for '{}' to {} group members (creator excluded)", activity.getTitle(), emails.size());
        emailService.sendEmailToMany(emails, subject, htmlBody);
    }

    public void notifyAttendanceChanged(Activity activity, AppGroup group, String userName, AttendanceStatus status) {
        List<UserRepresentation> members = keycloakService.listGroupMembers(group.getId());

        String statusLabel = switch (status) {
            case ACCEPTED -> "accepted";
            case DECLINED -> "declined";
            case MAYBE -> "tentatively accepted (maybe)";
        };

        String subject = userName + " has " + statusLabel + " the activity: " + activity.getTitle();

        String htmlBody = "<h2>Attendance Update</h2>"
            + "<p><strong>" + escapeHtml(userName) + "</strong> has <strong>" + statusLabel + "</strong> the activity "
            + "<strong>" + escapeHtml(activity.getTitle()) + "</strong> in <strong>" + escapeHtml(group.getName()) + "</strong>.</p>";

        List<String> emails = members.stream()
            .filter(member -> Boolean.TRUE.equals(member.isEmailVerified()))
            .map(member -> firstNonBlank(member.getEmail(), member.getUsername()))
            .filter(email -> email != null && !email.isBlank())
            .distinct()
            .toList();

        log.info("Sending attendance update notification for '{}' ({}) to {} group members", activity.getTitle(), statusLabel, emails.size());
        emailService.sendEmailToMany(emails, subject, htmlBody);
    }

    private static String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }

    private String buildActivityLink(Activity activity) {
        return frontendBaseUrl + "/groups/" + activity.getGroupId() + "/activities/" + activity.getId();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value == null) {
                continue;
            }
            String trimmed = value.trim();
            if (!trimmed.isEmpty()) {
                return trimmed;
            }
        }
        return null;
    }
}
