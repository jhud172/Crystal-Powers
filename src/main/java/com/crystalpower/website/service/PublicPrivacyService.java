package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** Public copy is supplied and explicitly approved by the operator, never generated from guesses. */
@Service
public class PublicPrivacyService {
    public record Section(@NotBlank @Pattern(regexp="information|uses|access|providers|retention|choices|browser-storage|payments") String id,@NotBlank @Size(max=100) String title,@NotBlank @Size(min=20,max=4000) String body) {}
    public record Document(@NotBlank @Size(max=170) String operator,@NotBlank @Email @Size(max=254) @Pattern(regexp="[^\\s<>?#%&]+@[^\\s<>?#%&]+") String contactEmail,@NotBlank @Pattern(regexp="[0-9]{4}-[0-9]{2}-[0-9]{2}") String updated,@NotNull @Size(min=8,max=8) List<@Valid Section> sections) {}
    private static final Set<String> REQUIRED=Set.of("information","uses","access","providers","retention","choices","browser-storage","payments");
    private final boolean requested;
    private final Document document;
    private final List<String> problems;
    public PublicPrivacyService(ObjectMapper json,Validator validator,@Value("${app.privacy.published:false}") boolean published,@Value("${app.privacy.content-json:}") String content){
        requested=published;Document candidate=null;List<String> errors=List.of();
        if(published){
            if(content==null || content.isBlank() || content.length()>65536)errors=List.of("Supply approved privacy content JSON within 65,536 characters.");
            else try{
                var parsed=json.readValue(content,Document.class);
                if(parsed==null || !validator.validate(parsed).isEmpty())errors=List.of("Check the operator, contact email, updated date and eight complete privacy sections.");
                else{LocalDate.parse(parsed.updated());var ids=parsed.sections().stream().map(Section::id).collect(java.util.stream.Collectors.toSet());if(!ids.equals(REQUIRED))errors=List.of("Include every required section once, without duplicate identifiers.");else candidate=new Document(parsed.operator(),parsed.contactEmail(),parsed.updated(),List.copyOf(parsed.sections()));}
            }catch(Exception invalid){errors=List.of("Privacy content could not be read. Use the documented JSON schema and ISO date.");}
        }
        document=candidate;problems=errors;
    }
    public boolean ready(){return requested && document!=null;}
    public Document published(){if(!ready())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Privacy information is not published.");return document;}
    public record Status(boolean ready) {}
    public Status status(){return new Status(ready());}
    public record Diagnostics(boolean publicationRequested,boolean ready,List<String> problems) {}
    public Diagnostics diagnostics(){return new Diagnostics(requested,ready(),problems);}
}
