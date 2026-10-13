package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.DataOutputStream;
import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.net.InetAddress;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Semaphore;

/** clamd INSTREAM uses only a trusted private endpoint configured by the operator. */
@Service
public class UploadScanner {
    private final boolean enabled;
    private final String host;
    private final int port;
    private final Semaphore slots=new Semaphore(2);
    public UploadScanner(@Value("${app.upload-scan.enabled:false}") boolean enabled,@Value("${app.upload-scan.host:}") String host,@Value("${app.upload-scan.port:3310}") int port) { this.enabled=enabled;this.host=host;this.port=port; }
    public boolean configured() { return enabled && (host.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}") || (host.contains(":") && host.matches("[0-9a-fA-F:]+"))) && port>0 && port<=65535; }
    public String scan(byte[] content) {
        if(!configured() || content.length==0 || content.length>15*1024*1024)return "ERROR";
        if(!slots.tryAcquire())return "ERROR";
        var deadline=Executors.newSingleThreadScheduledExecutor(runnable->{var thread=new Thread(runnable,"upload-scan-deadline");thread.setDaemon(true);return thread;});
        try(var socket=new Socket()) {
            InetAddress address=InetAddress.getByName(host);byte[] raw=address.getAddress();boolean ula=raw.length==16 && (raw[0]&254)==252;
            if(!address.isLoopbackAddress() && !address.isSiteLocalAddress() && !ula)return "ERROR";
            deadline.schedule(()->{try{socket.close();}catch(java.io.IOException ignored){}},20,TimeUnit.SECONDS);
            socket.connect(new InetSocketAddress(address,port),3000);socket.setSoTimeout(15000);
            var out=new DataOutputStream(socket.getOutputStream());out.write("zINSTREAM\0".getBytes(StandardCharsets.US_ASCII));
            for(int offset=0;offset<content.length;offset+=8192){int length=Math.min(8192,content.length-offset);out.writeInt(length);out.write(content,offset,length);}
            out.writeInt(0);out.flush();var reply=new ByteArrayOutputStream();var in=socket.getInputStream();
            for(int i=0;i<4096;i++){int value=in.read();if(value==-1)return "ERROR";if(value==0){String text=reply.toString(StandardCharsets.US_ASCII);if(text.equals("stream: OK"))return "CLEAN";if(text.startsWith("stream: ") && text.endsWith(" FOUND"))return "INFECTED";return "ERROR";}reply.write(value);}
            return "ERROR";
        } catch(java.io.IOException | IllegalArgumentException failure) { return "ERROR"; }
        finally { deadline.shutdownNow();slots.release(); }
    }
}
