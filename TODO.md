# TODO - Fix Llama-vision responses

- [ ] Fix Groq request payload so `messages[0].content` is a **string** (or matches Groq’s expected multimodal schema).
- [ ] Update `llama90b` request to correct multimodal formatting for the chosen vision model.
- [ ] Increase timeout and improve error propagation to frontend (show response.text).
- [ ] Add logging for outgoing payload shape (without leaking API key).
- [ ] Confirm correct Groq model IDs for “Llama-3.2-11b-vision” and “Llama-3.2-90b-vision”.
- [ ] After code changes: run server, submit one image, verify both boxes return answers.
