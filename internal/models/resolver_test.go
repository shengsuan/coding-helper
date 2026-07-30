package models

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/shengsuan/coding-helper/internal/config"
)

func TestResolverSelectsPreferredCompatibleModel(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/models" || r.Header.Get("Authorization") != "Bearer key" {
			t.Fatalf("unexpected request: %s", r.URL)
		}
		_, _ = w.Write([]byte(`{"data":[{"api_name":"chat","support_apis":["/v1/chat/completions"]},{"api_name":"responses","support_apis":["/v1/responses"]}]}`))
	}))
	defer s.Close()
	r := ModelResolver{Client: NewClient(s.Client())}
	m, all, err := r.Resolve(context.Background(), config.Plan{BaseURL: s.URL}, "key", "responses", Requirements{Protocols: []Protocol{ProtocolOpenAIResponses}, NeedsModel: true, NeedsAllModels: true})
	if err != nil || m.ID != "responses" || len(all) != 2 {
		t.Fatalf("model=%+v all=%d err=%v", m, len(all), err)
	}
}
