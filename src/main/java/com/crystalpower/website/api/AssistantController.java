package com.crystalpower.website.api;
import com.crystalpower.website.dto.AssistantChat.*;
import com.crystalpower.website.service.AssistantService;
import com.crystalpower.website.security.AttemptLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController
public class AssistantController {
 private final AssistantService assistant;private final AttemptLimiter limiter;
 public AssistantController(AssistantService assistant,AttemptLimiter limiter){this.assistant=assistant;this.limiter=limiter;}
 @PostMapping("/api/assistant/chat") public ResponseEntity<Reply> chat(@Valid @RequestBody Request body,HttpServletRequest request){
  limiter.check("assistant-peer:"+request.getRemoteAddr(),12,60);
  var session=request.getSession();
  synchronized(session){if(Boolean.TRUE.equals(session.getAttribute("prism.pending")))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Please wait for your reply.");session.setAttribute("prism.pending",true);}
  try{return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(assistant.answer(body));}
  finally{synchronized(session){session.removeAttribute("prism.pending");}}
 }
}
