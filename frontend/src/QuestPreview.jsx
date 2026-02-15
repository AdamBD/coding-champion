import './QuestPreview.css'

function QuestPreview({ quest, onSave }) {
  const totalSteps = quest.quest_steps?.length || 0
  const totalXp = quest.quest?.total_xp_reward || 0

  return (
    <div className="quest-preview-card">
      <div className="quest-preview-header">
        <h3 className="quest-preview-title">{quest.quest?.name || 'Untitled Quest'}</h3>
        {onSave && (
          <button className="quest-preview-save-button" onClick={onSave}>
            SAVE QUEST
          </button>
        )}
      </div>
      
      <p className="quest-preview-description">{quest.quest?.description || ''}</p>
      
      {quest.quest?.link && (
        <div className="quest-preview-link-section">
          <a 
            href={quest.quest.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="quest-preview-link-button"
          >
            OPEN RESOURCE →
          </a>
        </div>
      )}
      
      <div className="quest-preview-meta">
        <span>{totalSteps} Steps</span>
        <span>{totalXp.toLocaleString()} XP Total</span>
      </div>
      
      {quest.quest_steps && quest.quest_steps.length > 0 && (
        <div className="quest-preview-steps">
          <h4 className="quest-preview-steps-title">STEPS</h4>
          <div className="quest-preview-steps-list">
            {quest.quest_steps.map((step, index) => (
              <div key={index} className="quest-preview-step-item">
                <div className="quest-preview-step-indicator">
                  {step.step_order || index + 1}
                </div>
                <div className="quest-preview-step-content">
                  <div className="quest-preview-step-header">
                    <h5 className="quest-preview-step-name">{step.name}</h5>
                    <span className="quest-preview-step-xp">+{step.xp_reward || 0} XP</span>
                  </div>
                  <p className="quest-preview-step-description">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestPreview

