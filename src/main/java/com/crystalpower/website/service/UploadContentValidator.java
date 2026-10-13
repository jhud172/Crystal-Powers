package com.crystalpower.website.service;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.Map;
import java.util.Locale;

/** Bounded format/header checks; this is not an antivirus scan or a full media decoder. */
@Component
public class UploadContentValidator {
    public static final Set<String> TYPES=Set.of("image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm","video/quicktime");
    private static final int HEADER_LIMIT=256*1024;
    private static final Map<String,Set<String>> EXTENSIONS=Map.of(
            "image/jpeg",Set.of("jpg","jpeg","jfif"),"image/png",Set.of("png"),"image/gif",Set.of("gif"),"image/webp",Set.of("webp"),
            "video/mp4",Set.of("mp4","m4v"),"video/webm",Set.of("webm"),"video/quicktime",Set.of("mov"));
    public boolean filename(MultipartFile file) {
        return filename(file.getOriginalFilename(),file.getContentType());
    }
    public boolean filename(String name,String type) {
        if(name==null || type==null || name.isBlank() || name.codePointCount(0,name.length())>255 || name.matches("(?s).*[\\\\/\\p{Cntrl}:].*"))return false;
        int dot=name.lastIndexOf('.');return dot>0 && EXTENSIONS.getOrDefault(type,Set.of()).contains(name.substring(dot+1).toLowerCase(Locale.ROOT));
    }
    public boolean valid(MultipartFile file) throws IOException {
        byte[] bytes;try(var input=file.getInputStream()){bytes=input.readNBytes(HEADER_LIMIT);}
        return valid(file.getContentType(),file.getSize(),bytes);
    }
    public boolean valid(String type,long size,byte[] bytes) throws IOException {
        if(type==null || !TYPES.contains(type) || bytes.length<12)return false;
        return switch(type) {
            case "image/jpeg" -> (bytes[0]&255)==255 && (bytes[1]&255)==216 && (bytes[2]&255)==255 && imageDimensions(bytes,"JPEG");
            case "image/png" -> signature(bytes,0,137,80,78,71,13,10,26,10) && imageDimensions(bytes,"PNG");
            case "image/gif" -> (ascii(bytes,0,"GIF87a") || ascii(bytes,0,"GIF89a")) && imageDimensions(bytes,"GIF");
            case "image/webp" -> webp(bytes,size);
            case "video/mp4", "video/quicktime" -> isoMedia(bytes,size,type.equals("video/quicktime"));
            case "video/webm" -> webm(bytes);
            default -> false;
        };
    }
    private boolean imageDimensions(byte[] bytes,String format) throws IOException {
        try(var stream=new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())return false;var reader=readers.next();
            try { if(!reader.getFormatName().equalsIgnoreCase(format))return false;reader.setInput(stream,true,true);return dimensions(reader.getWidth(0),reader.getHeight(0)); }
            finally { reader.dispose(); }
        }
    }
    private static boolean dimensions(long width,long height) { return width>0 && height>0 && width<=12000 && height<=12000 && width*height<=80_000_000; }
    private static boolean webp(byte[] b,long size) {
        if(b.length<30 || !ascii(b,0,"RIFF") || !ascii(b,8,"WEBP") || little(b,4,4)+8!=size)return false;
        long chunk=little(b,16,4);if(chunk+20>size)return false;
        if(ascii(b,12,"VP8X"))return chunk==10 && dimensions(little(b,24,3)+1,little(b,27,3)+1);
        if(ascii(b,12,"VP8L")) { if(chunk<5 || (b[20]&255)!=47)return false;long packed=little(b,21,4);return dimensions((packed&16383)+1,((packed>>14)&16383)+1); }
        if(ascii(b,12,"VP8 "))return chunk>=10 && signature(b,23,157,1,42) && dimensions(little(b,26,2)&16383,little(b,28,2)&16383);
        return false;
    }
    private static boolean isoMedia(byte[] b,long size,boolean quicktime) {
        if(!ascii(b,4,"ftyp"))return false;long box=big(b,0,4);if(box<16 || box>Math.min(b.length,size) || box>4096 || box%4!=0)return false;
        Set<String> brands=quicktime ? Set.of("qt  ") : Set.of("isom","iso2","iso3","iso4","iso5","iso6","mp41","mp42","avc1","M4V ","dash","MSNV");
        for(int offset=8;offset<box;offset+=4){if(offset==12)continue;if(brands.contains(new String(b,offset,4,StandardCharsets.US_ASCII)))return true;}
        return false;
    }
    private static boolean webm(byte[] b) {
        if(!signature(b,0,26,69,223,163))return false;long[] header=vint(b,4,false);if(header==null || header[0]>4096)return false;
        long end=4+header[1]+header[0];if(end>b.length)return false;int at=(int)(4+header[1]);boolean webm=false;
        while(at<end) { long[] id=vint(b,at,true);if(id==null)return false;at+= (int)id[1];long[] length=vint(b,at,false);if(length==null)return false;at+=(int)length[1];if(length[0]>end-at)return false;if(id[0]==0x4282) { if(length[0]!=4 || !ascii(b,at,"webm"))return false;webm=true; }at+=(int)length[0]; }
        return webm && at==end;
    }
    private static long[] vint(byte[] b,int at,boolean id) {
        if(at>=b.length || b[at]==0)return null;int first=b[at]&255,mask=128,width=1;while((first&mask)==0){mask>>=1;width++;}
        if(width>(id ? 4 : 8) || at+width>b.length)return null;long value=id ? first : first&(mask-1);for(int i=1;i<width;i++)value=(value<<8)|(b[at+i]&255);return new long[]{value,width};
    }
    private static long little(byte[] b,int at,int length) { long value=0;for(int i=0;i<length;i++)value|=(long)(b[at+i]&255)<<(8*i);return value; }
    private static long big(byte[] b,int at,int length) { long value=0;for(int i=0;i<length;i++)value=(value<<8)|(b[at+i]&255);return value; }
    private static boolean ascii(byte[] b,int at,String value) { if(at+value.length()>b.length)return false;for(int i=0;i<value.length();i++)if((b[at+i]&255)!=value.charAt(i))return false;return true; }
    private static boolean signature(byte[] b,int at,int... value) { if(at+value.length>b.length)return false;for(int i=0;i<value.length;i++)if((b[at+i]&255)!=value[i])return false;return true; }
}
