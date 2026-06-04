#!/bin/bash
# Get your token first# Test login with the user you just created
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test /me with the access token from the register response
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# In another terminal, test the API directly:
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Update name + email
curl -X PATCH http://localhost:8000/api/v1/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"New Name","email":"newemail@example.com"}'

# Change password
curl -X POST http://localhost:8000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"current_password":"password123","new_password":"newpassword456"}'


# db
docker exec -it edge-db psql -U manudb -d finetune_studio \
  -c "SELECT id, email, name, role, is_active, created_at FROM users;"

----
dataset test

# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manu@gmail.com","password":"test@EMAIL"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get presigned upload URL
curl -X POST http://localhost:8000/api/v1/datasets/upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"file_name":"train.jsonl","file_size":50000,"format":"jsonl","dataset_name":"My dataset"}'

# List datasets
curl http://localhost:8000/api/v1/datasets \
  -H "Authorization: Bearer $TOKEN"

--verbouse output check dataset

# Check with -v to see the actual HTTP status
curl -v -X POST http://localhost:8000/api/v1/datasets/upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"file_name":"train.jsonl","file_size":50000,"format":"jsonl","dataset_name":"My dataset"}' 2>&1 | grep -E "< HTTP|{|}"


--- create a json file and sensd it to presigned url
# Create a test JSONL file
echo '{"instruction":"What is LoRA?","output":"LoRA is Low-Rank Adaptation for fine-tuning LLMs."}
{"instruction":"What is QLoRA?","output":"QLoRA combines 4-bit quantization with LoRA adapters."}
{"instruction":"What is fine-tuning?","output":"Fine-tuning adapts a pretrained model to a specific task."}' > test.jsonl

# Get presigned URL
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/datasets/upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"file_name":"test.jsonl","file_size":180,"format":"jsonl","dataset_name":"LoRA test dataset"}')

echo $RESPONSE | python3 -m json.tool

# Extract URL and key
UPLOAD_URL=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])")
OBJECT_KEY=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['object_key'])")

# Upload directly to MinIO (note: URL has finetune-minio hostname, replace with localhost for external access)
UPLOAD_URL_LOCAL=$(echo $UPLOAD_URL | sed 's/finetune-minio/localhost/')
curl -X PUT "$UPLOAD_URL_LOCAL" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.jsonl

# Confirm upload → inserts DB record
curl -X POST http://localhost:8000/api/v1/datasets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"object_key\":\"$OBJECT_KEY\",\"file_name\":\"test.jsonl\",\"file_size\":180,\"format\":\"jsonl\",\"dataset_name\":\"LoRA test dataset\",\"row_count\":3}"

# Verify it's in the list
curl http://localhost:8000/api/v1/datasets \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool


# Get fresh presigned URL
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/datasets/upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"file_name":"test.jsonl","file_size":180,"format":"jsonl","dataset_name":"Test"}')

UPLOAD_URL=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])")
echo $UPLOAD_URL   # should now show localhost:9000 not finetune-minio:9000

# Upload directly — no sed needed now
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.jsonl

# Fresh token + presigned URL
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/datasets/upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"file_name":"test.jsonl","file_size":180,"format":"jsonl","dataset_name":"Test"}')

UPLOAD_URL=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])")
OBJECT_KEY=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['object_key'])")

# Upload — should work now
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @test.jsonl

curl -X POST http://localhost:8000/api/v1/datasets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"object_key\":\"$OBJECT_KEY\",\"file_name\":\"test.jsonl\",\"file_size\":180,\"format\":\"jsonl\",\"dataset_name\":\"Test upload\",\"row_count\":3}"
