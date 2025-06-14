import { BaseSortingStrategy } from "./BaseSortingStrategy";
import { IUserProfileService } from "../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../interfaces/services/IUsernameExtractorService";

/**
 * Abstract base class for sorting strategies that require user profile services
 */
export abstract class BaseUserProfileSortingStrategy extends BaseSortingStrategy {
    constructor(
        protected userProfileService: IUserProfileService,
        protected usernameExtractorService: IUsernameExtractorService
    ) {
        super();
    }
} 