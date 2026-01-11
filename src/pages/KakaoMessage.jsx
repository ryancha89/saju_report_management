import { useState } from 'react';
import { Send, Users, Clock, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import './KakaoMessage.css';

const messageTemplates = [
  { id: 1, name: '리포트 완성 알림', content: '안녕하세요, {{customer_name}}님! 주문하신 {{product_name}} 리포트가 완성되었습니다. 확인해 주세요!' },
  { id: 2, name: '결제 확인', content: '{{customer_name}}님, {{product_name}} 결제가 완료되었습니다. 리포트는 24시간 내 발송됩니다.' },
  { id: 3, name: '발송 완료', content: '{{customer_name}}님께 {{product_name}} 리포트를 발송해 드렸습니다. 이메일을 확인해 주세요!' },
];

const pendingMessages = [
  { id: 1, customer: '이영희', phone: '010-2345-6789', product: '궁합 리포트', template: '리포트 완성 알림', scheduledAt: null },
  { id: 2, customer: '강민정', phone: '010-7890-1234', product: '2024 신년 사주', template: '발송 완료', scheduledAt: null },
];

const sentMessages = [
  { id: 1, customer: '김철수', phone: '010-1234-5678', template: '리포트 완성 알림', sentAt: '2024-01-15 14:30', status: 'success' },
  { id: 2, customer: '최지은', phone: '010-4567-8901', template: '발송 완료', sentAt: '2024-01-14 16:45', status: 'success' },
  { id: 3, customer: '정다운', phone: '010-5678-9012', template: '결제 확인', sentAt: '2024-01-13 10:20', status: 'failed' },
];

function KakaoMessage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedTemplate, setSelectedTemplate] = useState(messageTemplates[0]);
  const [messageContent, setMessageContent] = useState(messageTemplates[0].content);

  const handleTemplateChange = (templateId) => {
    const template = messageTemplates.find(t => t.id === parseInt(templateId));
    if (template) {
      setSelectedTemplate(template);
      setMessageContent(template.content);
    }
  };

  const handleSendAll = () => {
    alert(`${pendingMessages.length}건의 메시지를 발송합니다.`);
  };

  const handleSendOne = (customer) => {
    alert(`${customer}님에게 메시지를 발송합니다.`);
  };

  return (
    <div className="kakao-message">
      <div className="page-header">
        <h1>카카오 메시지</h1>
        <p>고객에게 카카오톡 메시지를 발송합니다.</p>
      </div>

      <div className="kakao-content">
        <div className="message-panel">
          <div className="panel-header">
            <h3>메시지 템플릿</h3>
          </div>
          <div className="panel-content">
            <div className="form-group">
              <label>템플릿 선택</label>
              <select
                value={selectedTemplate.id}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {messageTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>메시지 내용</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={6}
              />
              <span className="help-text">
                사용 가능한 변수: {'{{customer_name}}'}, {'{{product_name}}'}
              </span>
            </div>
            <div className="template-preview">
              <h4>미리보기</h4>
              <div className="preview-box">
                <div className="kakao-bubble">
                  {messageContent
                    .replace('{{customer_name}}', '홍길동')
                    .replace('{{product_name}}', '2024 신년 사주')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="recipients-panel">
          <div className="panel-tabs">
            <button
              className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={18} />
              발송 대기 ({pendingMessages.length})
            </button>
            <button
              className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
              onClick={() => setActiveTab('sent')}
            >
              <MessageSquare size={18} />
              발송 내역
            </button>
          </div>

          {activeTab === 'pending' && (
            <div className="panel-content">
              <div className="bulk-actions">
                <button className="btn btn-primary" onClick={handleSendAll}>
                  <Send size={16} />
                  전체 발송 ({pendingMessages.length}건)
                </button>
              </div>
              <div className="message-list">
                {pendingMessages.map(msg => (
                  <div key={msg.id} className="message-item">
                    <div className="message-info">
                      <strong>{msg.customer}</strong>
                      <span>{msg.phone}</span>
                      <span className="product-tag">{msg.product}</span>
                    </div>
                    <div className="message-actions">
                      <select defaultValue={msg.template}>
                        {messageTemplates.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSendOne(msg.customer)}
                      >
                        <Send size={14} />
                        발송
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="panel-content">
              <div className="message-list">
                {sentMessages.map(msg => (
                  <div key={msg.id} className="message-item sent">
                    <div className="message-info">
                      <strong>{msg.customer}</strong>
                      <span>{msg.phone}</span>
                      <span className="template-name">{msg.template}</span>
                    </div>
                    <div className="message-status">
                      <span className="sent-time">{msg.sentAt}</span>
                      {msg.status === 'success' ? (
                        <CheckCircle size={18} className="status-success" />
                      ) : (
                        <AlertCircle size={18} className="status-failed" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KakaoMessage;
