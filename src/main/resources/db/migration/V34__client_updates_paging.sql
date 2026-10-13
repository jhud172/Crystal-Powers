CREATE INDEX support_message_client_page_idx ON support_message(request_id,kind,portal_visible,created_at,id);
CREATE INDEX client_reply_page_idx ON client_reply(request_id,created_at,id);
CREATE INDEX support_event_client_page_idx ON support_event(request_id,customer_visible,created_at,id);
