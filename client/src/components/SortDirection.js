import './SortDirection.scss';
import { trivial_text_maker } from '../models/text.js';

export const SortDirection = ({ sortDirection, active }) => (
  <button
    className="SortIndicator"
    style={{ 
      color: "white",
      fontSize: '1.2em',
    }}
    aria-label={trivial_text_maker(
      sortDirection === "ASC" ? 
      "a11y_sort_asc" :
      "a11y_sort_desc"  
    )}
    aria-pressed={active}
  >
    { 
      active ? (
        sortDirection === 'ASC' ? 
        "▲" : 
        "▼"         
      ) : (
        sortDirection === 'ASC' ? 
        "△" : 
        "▽"
      )
    }
  </button>
);

export const SortDirections = ({ asc, desc }) => <div className="text-nowrap">
  <SortDirection sortDirection="ASC" active={asc} />
  <SortDirection sortDirection="DESC" active={desc} />
</div>;
