package com.merible.writer;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.*;
import android.print.PrintManager;
import android.content.Context;
import android.widget.Toast;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.*;

public class MainActivity extends Activity {
  private WebView web;
  private byte[] pending; private String pendingMime;
  private static final int SAVE=10, RESTORE=11;
  @Override public void onCreate(Bundle state){super.onCreate(state);
    web=new WebView(this);setContentView(web);
    WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(true);settings.setAllowContentAccess(false);
    settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
    web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){return true;}});
    web.addJavascriptInterface(new Bridge(),"Android");web.loadUrl("file:///android_asset/index.html");
  }
  private void notifyUser(String message){runOnUiThread(()->Toast.makeText(this,message,Toast.LENGTH_LONG).show());}
  private void saveFile(byte[] bytes,String name,String mime){runOnUiThread(()->{
    pending=bytes;pendingMime=mime;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);
    i.setType(mime);i.putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(i,SAVE);
  });}
  @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
    if(result!=RESULT_OK||data==null||data.getData()==null)return;
    Uri uri=data.getData();
    if(request==SAVE){try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new IOException("No output stream");out.write(pending);notifyUser("File saved");}catch(Exception e){notifyUser("Save failed: "+e.getMessage());}finally{pending=null;}}
    if(request==RESTORE){try(InputStream in=getContentResolver().openInputStream(uri)){if(in==null)throw new IOException("Cannot open backup");ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){out.write(buf,0,n);if(out.size()>10_000_000)throw new IOException("Backup too large");}String json=new String(out.toByteArray(),StandardCharsets.UTF_8);web.evaluateJavascript("window.restoreNativeBackup("+JSONObject.quote(json)+")",null);}catch(Exception e){notifyUser("Restore failed: "+e.getMessage());}}
  }
  private static void entry(ZipOutputStream zip,String name,String content)throws IOException{zip.putNextEntry(new ZipEntry(name));zip.write(content.getBytes(StandardCharsets.UTF_8));zip.closeEntry();}
  private static String xml(String s){return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&apos;");}
  private static String paragraph(String s){return "<w:p><w:r><w:t xml:space=\"preserve\">"+xml(s)+"</w:t></w:r></w:p>";}
  private static byte[] docx(String raw)throws Exception{
    JSONObject obj=new JSONObject(raw);String title=obj.optString("title","Document");JSONArray ps=obj.getJSONArray("paragraphs");
    StringBuilder body=new StringBuilder(paragraph(title));for(int i=0;i<ps.length()&&i<10000;i++)body.append(paragraph(ps.optString(i)));
    String document="<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>"+body+"<w:sectPr/></w:body></w:document>";
    ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(ZipOutputStream z=new ZipOutputStream(bytes)){
      entry(z,"[Content_Types].xml","<?xml version=\"1.0\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>");
      entry(z,"_rels/.rels","<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>");
      entry(z,"word/document.xml",document);
    }return bytes.toByteArray();
  }
  public class Bridge{
    @JavascriptInterface public void exportDocx(String raw){try{JSONObject obj=new JSONObject(raw);String name=obj.optString("title","Document").replaceAll("[^a-zA-Z0-9 _-]","_");if(name.isEmpty())name="Document";saveFile(docx(raw),name+".docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document");}catch(Exception e){notifyUser("DOCX export failed: "+e.getMessage());}}
    @JavascriptInterface public void backup(String raw){saveFile(raw.getBytes(StandardCharsets.UTF_8),"merible-backup.json","application/json");}
    @JavascriptInterface public void restore(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");startActivityForResult(i,RESTORE);});}
    @JavascriptInterface public void printPdf(){runOnUiThread(()->{PrintManager pm=(PrintManager)getSystemService(Context.PRINT_SERVICE);pm.print("Merible Writer",web.createPrintDocumentAdapter("Merible Writer"),null);});}
  }
  @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
