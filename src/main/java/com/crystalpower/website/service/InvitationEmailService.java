package com.crystalpower.website.service;

import com.crystalpower.website.repository.InvitationEmailRepository.Kind;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;
import java.net.URI;
import java.util.List;
import java.util.UUID;

/** One committed claim per invitation; unknown provider outcomes are never automatically resent. */
@Service
public class InvitationEmailService {
    public record View(String state,String email,java.time.Instant expiresAt,boolean available,String availabilityMessage) {}
    private final InvitationEmailStore store;
    private final EmailTransport mail;
    private final String publicUrl,replyTo;
    private final boolean enabled;
    public InvitationEmailService(InvitationEmailStore store,EmailTransport mail,@Value("${app.public-url:}") String publicUrl,@Value("${app.mail.admin-reply-to:${app.mail.reply-to:}}") String replyTo,@Value("${app.mail.invitation-enabled:false}") boolean enabled){this.store=store;this.mail=mail;this.publicUrl=publicUrl;this.replyTo=replyTo;this.enabled=enabled;}
    private String origin(){try{var uri=URI.create(publicUrl);if(!"https".equals(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null || !(uri.getPath().isEmpty() || uri.getPath().equals("/")))throw new IllegalArgumentException();return uri.getScheme()+"://"+uri.getRawAuthority();}catch(IllegalArgumentException failure){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Invitation delivery requires the configured HTTPS public site origin.");}}
    private View view(InvitationEmailStore.Result result){boolean available=enabled && mail.configured();String message=available ? "" : "Company invitation email is disabled or unconfigured. Manual private sharing remains available.";if(available){try{origin();}catch(ResponseStatusException failure){available=false;message=failure.getReason();}}return new View(result.state(),result.email(),result.expiresAt(),available,message);}
    public View status(Authentication auth,Kind kind,UUID resource,int version,String token){return view(store.status(auth,kind,resource,version,token));}
    public View send(Authentication auth,Kind kind,UUID resource,int version,String token){
        if(!enabled || !mail.configured())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Company invitation email is not enabled and configured. The private invitation remains available for manual delivery.");
        String base=origin();var plan=store.prepare(auth,kind,resource,version,token);
        if(!plan.claimed())return view(new InvitationEmailStore.Result(plan.state(),plan.target().email(),plan.target().expiresAt()));
        String link=base+(kind==Kind.TEAM ? "/team/activate#token=" : "/client/activate#token=")+token;
        String html="<p>Hello "+HtmlUtils.htmlEscape(plan.target().name())+",</p><p>You have been invited to the Crystal Powers "+(kind==Kind.TEAM ? "team" : "client")+" workspace. Choose your own password using your private activation link.</p><p><a href=\""+HtmlUtils.htmlEscape(link)+"\">Activate your account</a></p><p>This invitation expires at "+HtmlUtils.htmlEscape(plan.target().expiresAt().toString())+". Keep the link private. If you were not expecting this invitation, contact the team using your existing contact details.</p>";
        try{mail.send(new EmailTransport.Message(plan.target().email(),replyTo.isBlank() ? null : replyTo,"Crystal Powers | Private account invitation",html,List.of()),"cp-invitation-"+plan.id());}
        catch(EmailTransport.DeliveryException failure){store.finish(plan,false);throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"The invitation email outcome is unknown. Check its status; this invitation will not be automatically resent. Replace it only after checking the recipient and delivery.");}
        store.finish(plan,true);return status(auth,kind,resource,version,token);
    }
}
